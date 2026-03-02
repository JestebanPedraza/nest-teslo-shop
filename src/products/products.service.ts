import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException, Query } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ){}


  async create(createProductDto: CreateProductDto) {
    try {
      const product = this.productRepository.create(createProductDto);
      await this.productRepository.save(product);
      return product;
    } catch (error) {
    
      this.handleDBExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
    });
    return products;

  }

  async findOne(term: string) {
    let product: Product | null;
    if (!isNaN(+term)) {
      product = await this.productRepository.findOneBy({ id: +term });
    } else {
      product = await this.productRepository.findOne({
        where: [
          { slug: term },
          { title: term },
        ],
      });
    }

    /**
     * Query builder example:
     * const product = await this.productRepository.createQueryBuilder('prod')
     *   .where('prod.id = :id', { id: term })
     *   .orWhere('prod.slug = :slug', { slug: term })
     *   .orWhere('UPPER(prod.title) = UPPER(:title)', { title: term })
     *   .getOne();
     */

    if (!product) {
      throw new NotFoundException(
        `Product with term "${term}" not found`,
      );
    }
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.preload({ 
      id,
      ...updateProductDto
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    try {
      await this.productRepository.save(product);
      return product;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(term: string) {
    const product = await this.findOne(term);
    await this.productRepository.remove(product);
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') {
      this.logger.error(error.detail);
      throw new BadRequestException(error.detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs');
  }
}
